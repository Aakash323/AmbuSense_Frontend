import DriverLocationTracker from "@/components/socket/DriverLocationTracker";
import TestSocketButton from "@/components/socket/TestSocketButton";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden p-4 sm:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Driver Test
        </h1>
        <DriverLocationTracker ambulanceId="69d944de1a2be1cafdb3ba95" />
        <TestSocketButton />
      </div>
    </main>
  );
}
