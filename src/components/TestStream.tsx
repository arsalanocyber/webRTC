import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { VideoMediaStream } from "./video-media-stream";

const socket = io("https://arslan-server.local.ocyber.work");

const TestStream: React.FC = () => {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const [isCallActive, setIsCallActive] = useState(false);
    const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);

    useEffect(() => {
        peerConnection.current = new RTCPeerConnection({
            iceServers: [
                {
                    urls: 'turn:192.158.29.39:3478?transport=udp',
                    username: '28224511:1379330808',
                    credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA='
                },
            ]
        });

        // Get local video and audio stream
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

        // Handle incoming remote stream tracks
        peerConnection.current.ontrack = (event) => {
            console.log("event streams", event.streams);
            setRemoteStreams([...event.streams]);
        };

        // ICE Candidate handling
        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", event.candidate);
            }
        };

        // When receiving an offer
        socket.on("offer", async (offer) => {
            console.log("Received offer:", offer);
            if (peerConnection.current?.signalingState === "stable") {
                await peerConnection.current?.setRemoteDescription(
                    new RTCSessionDescription(offer)
                );
                const answer = await peerConnection.current?.createAnswer();
                await peerConnection.current?.setLocalDescription(answer);
                socket.emit("answer", answer);
            }
        });

        // When receiving an answer
        socket.on("answer", async (answer) => {
            console.log("Received answer:", answer);
            if (peerConnection.current?.signalingState === "have-local-offer") {
                await peerConnection.current?.setRemoteDescription(
                    new RTCSessionDescription(answer)
                );
            }
        });

        // ICE candidate from remote peer
        socket.on("ice-candidate", async (candidate) => {
            console.log("Received ICE candidate:", candidate);
            try {
                await peerConnection.current?.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
            } catch (error) {
                console.error("Error adding received ICE candidate", error);
            }
        });

        return () => {
            socket.off();
            peerConnection.current?.close();
        };
    }, []);

    // Create an offer for the call
    const createOffer = async () => {
        if (peerConnection.current) {
            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);
            socket.emit("offer", offer);
            setIsCallActive(true);
        }
    };

    return (
        <div>
            <video ref={localVideoRef} autoPlay playsInline muted />
            {remoteStreams.map((stream, index) => (
                <div key={index}>
                    <VideoMediaStream mediaStream={stream} />
                </div>
            ))}
            {!isCallActive && <button onClick={createOffer}>Call</button>}
        </div>
    );
};

export default TestStream;
