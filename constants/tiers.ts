export const tiers = [
  {
    id: "scanner",
    tier: 1,
    name: "Scanner",
    rank: "Tier 1",
    scanThreshold: 5,
    referralThreshold: 0,
    requirement: "Create an account and scan 5 QR codes.",
    allocation: "Base allocation"
  },
  {
    id: "referrer",
    tier: 2,
    name: "Referrer",
    rank: "Tier 2",
    scanThreshold: 5,
    referralThreshold: 1,
    requirement: "Invite 1 person with your referral link.",
    allocation: "2x allocation"
  },
  {
    id: "guardian",
    tier: 3,
    name: "Guardian",
    rank: "Tier 3",
    scanThreshold: 50,
    referralThreshold: 2,
    requirement: "Invite multiple people and scan 50 QR codes.",
    allocation: "5x allocation"
  }
] as const;
