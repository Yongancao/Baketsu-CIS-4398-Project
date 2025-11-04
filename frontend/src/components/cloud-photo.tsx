import Image from "next/image";

export default function CloudImage() {
  return (
    <div>
      <Image
        src="/home/cloud-cpu.png"
        alt="Cloud"
        width={300}
        height={300}
        className="object-contain"
      />
    </div>
  );
}
