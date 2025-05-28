export type Badge = {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  rule: 'first_checkin' | 'ten_pubs' | 'early_riser' | 'royalty_theme';
};

