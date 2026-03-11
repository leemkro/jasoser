export type CreditPackageId = "pack5" | "pack15" | "pack40";

export interface CreditPackage {
  id: CreditPackageId;
  title: string;
  amount: number;
  credits: number;
  highlight?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "pack5",
    title: "5회 이용권",
    amount: 3900,
    credits: 5,
  },
  {
    id: "pack15",
    title: "15회 이용권",
    amount: 9900,
    credits: 15,
    highlight: true,
  },
  {
    id: "pack40",
    title: "40회 이용권",
    amount: 19900,
    credits: 40,
  },
];

export function getCreditPackageById(packageId: string) {
  return CREDIT_PACKAGES.find((item) => item.id === packageId) ?? null;
}
