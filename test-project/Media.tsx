export function Image({ src }: { src: string }) {
  return (
    <img
      src={src}
      className="w-full h-auto object-cover rounded-lg"
      alt=""
    />
  );
}

export function VideoThumb({ src }: { src: string }) {
  return (
    <img
      src={src}
      className="w-full h-auto object-cover rounded-lg"
      alt=""
    />
  );
}
