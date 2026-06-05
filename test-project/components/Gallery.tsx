const images = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'];

export function Gallery() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map((src) => (
        <img
          key={src}
          src={src}
          className="w-full h-auto object-cover rounded-lg"
          alt=""
        />
      ))}
    </div>
  );
}
