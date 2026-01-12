import { ethers } from "ethers";
import SeatSBTArtifact from "@/lib/abi/SeatSBT.json";
import { ADDRESSES } from "@/lib/contracts/addresses";

export async function seatOwnerOf(seatId: bigint): Promise<string> {
  // @ts-expect-error
  if (!window?.ethereum) throw new Error("NO_WALLET");

  // @ts-expect-error
  const provider = new ethers.BrowserProvider(window.ethereum);
  const seat = new ethers.Contract(ADDRESSES.seatSBT, (SeatSBTArtifact as any).abi, provider);

  const owner: string = await seat.ownerOf(seatId);
  return owner;
}
