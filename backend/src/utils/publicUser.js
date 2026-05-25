const betaUserCutoff = new Date("2026-08-01T00:00:00.000Z");

export function userBadges(user) {
  const badges = [
    {
      id: "verified",
      label: "Verified",
      description: "Account verified by blunder.ch",
    },
  ];

  if (user.is_premium) {
    badges.push({
      id: "premium",
      label: "Premium",
      description: "Premium account",
    });
  }

  if (user.created_at && new Date(user.created_at).getTime() < betaUserCutoff.getTime()) {
    badges.push({
      id: "beta",
      label: "Beta",
      description: "Joined before August 1, 2026",
    });
  }

  return badges;
}

export function publicUser(user) {
  return {
    id: user.id,
    provider: user.provider,
    username: user.username,
    email: user.email,
    is_premium: user.is_premium,
    premium_redeemed_at: user.premium_redeemed_at,
    created_at: user.created_at,
    badges: userBadges(user),
  };
}
