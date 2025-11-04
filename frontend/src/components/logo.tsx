import Image from "next/image";

export default function Logo() {
  return (
    <div>
      <Image
        src="/logo-blue.png"
        alt="Cloud"
        width={50}
        height={50}
      />
    </div>
  );
}
