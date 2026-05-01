import DriverLocationTracker from "@/components/socket/DriverLocationTracker";
import TestSocketButton from "@/components/socket/TestSocketButton";
import Image from "next/image";

export default function Home() {
  return (
    <>
     <div>
      <h1>Driver Test</h1>
      <DriverLocationTracker ambulanceId="69d944de1a2be1cafdb3ba95" />
      <TestSocketButton />
    </div>
    </>
  )
}
