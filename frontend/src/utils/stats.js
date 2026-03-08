export const STAT_CATEGORIES = {
  offense: {
    label: 'Offense',
    color: '#f5a623',
    stats: [
      { key: 'td_passing',     label: 'Passing TD',         icon: '🏈', unit: null,   description: 'Touchdown pass (QB)' },
      { key: 'td_receiving',   label: 'Receiving TD',       icon: '🙌', unit: null,   description: 'Touchdown catch (WR/TE/RB)' },
      { key: 'td_rushing',     label: 'Rushing TD',         icon: '🏃', unit: null,   description: 'Touchdown run (RB/QB)' },
      { key: 'receiving_yds',  label: 'Receiving Yards',    icon: '📡', unit: 'yds',  description: 'Yards after catch' },
      { key: 'rushing_yds',    label: 'Rushing Yards',      icon: '💨', unit: 'yds',  description: 'Yards run' },
      { key: 'passing_yds',    label: 'Passing Yards',      icon: '💫', unit: 'yds',  description: 'Yards thrown' },
      { key: 'reception',      label: 'Reception',          icon: '👐', unit: null,   description: 'Catch made' },
      { key: 'two_pt_pass',    label: '2PT Conv Pass',      icon: '✌️', unit: null,   description: '2-pt conversion pass (QB)' },
      { key: 'two_pt_rec',     label: '2PT Conv Reception', icon: '🤲', unit: null,   description: '2-pt conversion catch' },
      { key: 'two_pt_carry',   label: '2PT Conv Carry',     icon: '💪', unit: null,   description: '2-pt conversion run' },
      { key: 'one_pt_pass',    label: '1PT Conv Pass',      icon: '1️⃣', unit: null,   description: '1-pt conversion pass (QB)' },
      { key: 'one_pt_rec',     label: '1PT Conv Reception', icon: '☝️', unit: null,   description: '1-pt conversion catch' },
    ]
  },
  defense: {
    label: 'Defense',
    color: '#4a90d9',
    stats: [
      { key: 'tackle',         label: 'Tackle',             icon: '💪', unit: null,   description: 'Solo tackle' },
      { key: 'tackle_assist',  label: 'Tackle Assist',      icon: '🤝', unit: null,   description: 'Assisted tackle' },
      { key: 'tfl',            label: 'TFL',                icon: '📉', unit: null,   description: 'Tackle for loss' },
      { key: 'sack',           label: 'Sack',               icon: '🔨', unit: null,   description: 'QB sack' },
      { key: 'interception',   label: 'Interception',       icon: '🎯', unit: null,   description: 'INT' },
      { key: 'pbu',            label: 'PBU',                icon: '✋', unit: null,   description: 'Pass break-up' },
      { key: 'fumble_rec',     label: 'Fumble Recovery',    icon: '💎', unit: null,   description: 'Fumble recovered' },
      { key: 'forced_fumble',  label: 'Forced Fumble',      icon: '💥', unit: null,   description: 'Fumble forced' },
    ]
  },
  special: {
    label: 'Special Teams',
    color: '#6edba8',
    stats: [
      { key: 'kick_return_yds', label: 'Kick Return Yds',  icon: '🔄', unit: 'yds',  description: 'Kick return yards' },
      { key: 'punt_return_yds', label: 'Punt Return Yds',  icon: '⬆️', unit: 'yds',  description: 'Punt return yards' },
      { key: 'pat_kick',        label: 'PAT Kick',         icon: '🦵', unit: null,   description: 'Extra point kick' },
      { key: 'field_goal',      label: 'Field Goal',       icon: '🥅', unit: null,   description: 'Field goal made' },
    ]
  }
};

export const ALL_STATS = Object.values(STAT_CATEGORIES).flatMap(c => c.stats);

export function getStatInfo(key) {
  return ALL_STATS.find(s => s.key === key) || { key, label: key, icon: '📊', unit: null };
}

export const POSITIONS = [
  'QB', 'RB', 'FB', 'WR', 'TE', 'OL', 'OT', 'OG', 'C',
  'DL', 'DE', 'DT', 'LB', 'MLB', 'OLB', 'CB', 'S', 'FS', 'SS',
  'K', 'P', 'LS', 'KR', 'PR',
];