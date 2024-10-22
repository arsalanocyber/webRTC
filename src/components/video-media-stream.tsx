import { type HTMLProps, useEffect, useRef } from "react";

type VideoProps = HTMLProps<HTMLVideoElement>;

interface Props
  extends Pick<
    VideoProps,
    | "id"
    | "className"
    | "style"
    | "autoPlay"
    | "playsInline"
    | "muted"
    | "width"
    | "height"
    | "onLoad"
  > {
  mediaStream?: MediaStream;
}

export function VideoMediaStream(props: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  console.log(props.mediaStream);
  useEffect(() => {
    if (props.mediaStream && ref.current) {
      ref.current.srcObject = props.mediaStream; // not showing video using this appraoch
    } else if (ref.current) {
      ref.current.srcObject = null;
    }
  }, [props.mediaStream, ref]);

  return (
    <video
      ref={ref}
      id={props.id}
      className={props.className}
      style={props.style}
      autoPlay
      playsInline
      muted
      width={props.width}
      height={props.height}
      onLoad={props.onLoad}
    />
  );
}
