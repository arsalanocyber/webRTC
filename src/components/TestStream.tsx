import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { VideoMediaStream } from "./video-media-stream";

const socket = io("http://localhost:5000");

const TestStream: React.FC = () => {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const [isCallActive, setIsCallActive] = useState(false);
    const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);

    useEffect(() => {
        peerConnection.current = new RTCPeerConnection();

        navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then((stream) => {
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                stream.getTracks().forEach((track) => {
                    peerConnection.current?.addTrack(track, stream);
                });
            });

        peerConnection.current.ontrack = (event) => {
            console.log("event streams", event.streams);
            setRemoteStreams([...event.streams]);
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", event.candidate);
            }
        };

        socket.on("offer", async (offer) => {
            console.log({ offer });
            await peerConnection.current?.setRemoteDescription(
                new RTCSessionDescription(offer)
            );
            const answer = await peerConnection.current?.createAnswer();
            await peerConnection.current?.setLocalDescription(answer);
            socket.emit("answer", answer);
        });

        socket.on("answer", async (answer) => {
            console.log({ answer });
            await peerConnection.current?.setRemoteDescription(
                new RTCSessionDescription(answer)
            );
        });

        socket.on("ice-candidate", async (candidate) => {
            console.log({ candidate });
            await peerConnection.current?.addIceCandidate(
                new RTCIceCandidate(candidate)
            );
        });

        return () => {
            socket.off();
            peerConnection.current?.close();
        };
    }, [socket]);

    const createOffer = async () => {
        const offer = await peerConnection.current?.createOffer();
        await peerConnection.current?.setLocalDescription(offer);
        socket.emit("offer", offer);
        setIsCallActive(true);
    };

    console.log({remoteStreams})
    return (
        <div>
            <video ref={localVideoRef} autoPlay playsInline muted />
            {remoteStreams.map((stream) => (
                <>
                    <VideoMediaStream mediaStream={stream} />
                </>
            ))}
            {!isCallActive && <button onClick={createOffer}>Call</button>}
        </div>
    );
};

export default TestStream;
