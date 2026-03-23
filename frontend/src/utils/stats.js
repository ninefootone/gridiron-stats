export const STAT_CATEGORIES = {
  offense: {
    label: 'Offense',
    color: '#f5a623',
    stats: [
      { key: 'td_passing',     label: 'Passing TD',         icon: '🏈', unit: null,   description: 'Touchdown pass (QB)',                    flag: true,  contact: true },
      { key: 'td_receiving',   label: 'Receiving TD',       icon: '🙌', unit: null,   description: 'Touchdown catch (WR/TE/RB)',             flag: true,  contact: true, excludeFromStatFirst: true },
      { key: 'td_rushing',     label: 'Rushing TD',         icon: '🏃', unit: null,   description: 'Touchdown run (RB/QB)',                  flag: true,  contact: true },
      { key: 'receiving_yds',  label: 'Receiving Yards',    icon: '📡', unit: 'yds',  description: 'Yards after catch',                     flag: true,  contact: true },
      { key: 'rushing_yds',    label: 'Rushing Yards',      icon: '💨', unit: 'yds',  description: 'Yards run',                             flag: true,  contact: true },
      { key: 'passing_yds',    label: 'Passing Yards',      icon: '💫', unit: 'yds',  description: 'Yards thrown',                          flag: true,  contact: true },
      { key: 'reception',      label: 'Reception',          icon: '👐', unit: null,   description: 'Catch made',                            flag: true,  contact: true },
      { key: 'two_pt_pass',    label: '2PT Conv Pass',      icon: '✌️', unit: null,   description: '2-pt conversion pass (QB)',              flag: true,  contact: true },
      { key: 'two_pt_rec',     label: '2PT Conv Reception', icon: '🤲', unit: null,   description: '2-pt conversion catch',                 flag: true,  contact: true, excludeFromStatFirst: true },
      { key: 'two_pt_carry',   label: '2PT Conv Carry',     icon: '💪', unit: null,   description: '2-pt conversion run',                   flag: true,  contact: true },
      { key: 'one_pt_pass',    label: '1PT Conv Pass',      icon: '1️⃣', unit: null,   description: '1-pt conversion pass (QB)',              flag: true,  contact: true },
      { key: 'one_pt_rec',     label: '1PT Conv Reception', icon: '☝️', unit: null,   description: '1-pt conversion catch',                 flag: true,  contact: true, excludeFromStatFirst: true },
      { key: 'one_pt_carry',   label: '1PT Conv Carry',     icon: '🤛', unit: null,   description: '1-pt conversion run',                   flag: true,  contact: true },
    ]
  },
  defense: {
    label: 'Defense',
    color: '#4a90d9',
    stats: [
      { key: 'tackle',         label: 'Tackle',             icon: '💪', unit: null,   description: 'Solo tackle / flag pull',               flag: true,  contact: true },
      { key: 'tackle_assist',  label: 'Tackle Assist',      icon: '🤝', unit: null,   description: 'Assisted tackle',                       flag: false, contact: true, show_more: true },
      { key: 'tfl',            label: 'TFL',                icon: '📉', unit: null,   description: 'Tackle for loss',                       flag: true,  contact: true },
      { key: 'sack',           label: 'Sack',               icon: '🔨', unit: null,   description: 'QB sack',                               flag: true,  contact: true },
      { key: 'interception',   label: 'Interception',       icon: '🎯', unit: null,   description: 'INT',                                   flag: true,  contact: true },
      { key: 'pbu',            label: 'PBU',                icon: '✋', unit: null,   description: 'Pass break-up',                         flag: true,  contact: true },
      { key: 'td_return',      label: 'Return TD',          icon: '🏆', unit: null,   description: 'Defensive/special teams return TD',     flag: true,  contact: true },
      { key: 'return_2pt',     label: 'Return 2PT Conv',    icon: '✌️', unit: null,   description: 'Defensive return 2PT conversion',       flag: true,  contact: true },
      { key: 'return_1pt',     label: 'Return 1PT Conv',    icon: '1️⃣', unit: null,   description: 'Defensive return 1PT conversion',       flag: true,  contact: true },
      { key: 'fumble_rec',     label: 'Fumble Recovery',    icon: '💎', unit: null,   description: 'Fumble recovered',                      flag: false, contact: true, show_more: true },
      { key: 'forced_fumble',  label: 'Forced Fumble',      icon: '💥', unit: null,   description: 'Fumble forced',                         flag: false, contact: true, show_more: true },
    ]
  },
  special: {
    label: 'Special Teams',
    color: '#6edba8',
    stats: [
      { key: 'kick_return_yds', label: 'Kick Return Yds',  icon: '🔄', unit: 'yds',  description: 'Kick return yards',                     flag: false, contact: true, show_more: true },
      { key: 'punt_return_yds', label: 'Punt Return Yds',  icon: '⬆️', unit: 'yds',  description: 'Punt return yards',                     flag: false, contact: true, show_more: true },
      { key: 'pat_kick',        label: 'PAT Kick',         icon: '🦵', unit: null,   description: 'Extra point kick',                      flag: false, contact: true, show_more: true },
      { key: 'field_goal',      label: 'Field Goal',       icon: '🥅', unit: null,   description: 'Field goal made',                       flag: false, contact: true, show_more: true },
    ]
  }
};

export const ALL_STATS = Object.entries(STAT_CATEGORIES).flatMap(([key, c]) => c.stats.map(s => ({ ...s, category: key })));
export const COUNTING_STATS = ALL_STATS.filter(s => s.unit === null);

export function getStatInfo(key) {
  return ALL_STATS.find(s => s.key === key) || { key, label: key, icon: '📊', unit: null };
}

// Filter stats by team type
export function getStatsForTeamType(teamType, showMore = false) {
  return ALL_STATS.filter(s => {
    if (!teamType) return true;
    if (teamType === 'flag') {
      if (s.show_more) return showMore; // show_more stats only shown when toggled
      return s.flag;
    }
    if (teamType === 'contact') return s.contact;
    return true;
  });
}


// All positions
export const POSITIONS = [
  'QB', 'RB', 'FB', 'WR', 'TE', 'OL', 'OT', 'OG', 'C',
  'DL', 'DE', 'DT', 'LB', 'MLB', 'OLB', 'CB', 'S', 'FS', 'SS',
  'K', 'P', 'LS', 'KR', 'PR',
  'Defense', 'Offense',
];

// Flag-specific positions
export const POSITIONS_FLAG = [
  'QB', 'RB', 'WR', 'C', 'LB', 'DB', 'CB', 'S', 'Rusher/Blitz',
  'Offense', 'Defense',
];

// Contact positions — full list
export const POSITIONS_CONTACT = [...POSITIONS];

// Helper — get positions for a team type
export function getPositionsForTeamType(teamType, showAll = false) {
  if (!teamType || teamType === 'contact' || showAll) return POSITIONS;
  if (teamType === 'flag') return POSITIONS_FLAG;
  return POSITIONS;
}

export function getStatNarrative(stat, allStats) {
  const name = `#${stat.player_number} ${stat.player_name}`;
  const val = stat.value;

  function findPaired(type) {
    return allStats.find(s =>
      s.id !== stat.id &&
      s.stat_type === type &&
      s.game_id === stat.game_id &&
      Math.abs(new Date(s.logged_at) - new Date(stat.logged_at)) < 3000
    );
  }

  switch (stat.stat_type) {
    case 'td_passing': {
      const rec = findPaired('td_receiving');
      return rec
        ? `🏈 ${name} threw a TD pass to #${rec.player_number} ${rec.player_name}`
        : `🏈 ${name} threw a touchdown pass`;
    }
    case 'td_receiving': {
      const pass = findPaired('td_passing');
      return pass ? null : `🏈 ${name} caught a touchdown pass`;
    }
    case 'td_rushing':
      return `🏈 ${name} ran for a rushing touchdown`;
    case 'td_return':
      return `🏆 ${name} returned the ball for a touchdown`;
    case 'return_2pt':
      return `✌️ ${name} returned for a 2PT conversion`;
    case 'return_1pt':
      return `1️⃣ ${name} returned for a 1PT conversion`;

    case 'two_pt_pass': {
      const rec = findPaired('two_pt_rec');
      return rec
        ? `✌️ ${name} converted the 2PT pass to #${rec.player_number} ${rec.player_name}`
        : `✌️ ${name} threw a 2PT conversion pass`;
    }
    case 'two_pt_rec': {
      const pass = findPaired('two_pt_pass');
      return pass ? null : `✌️ ${name} caught a 2PT conversion`;
    }
    case 'two_pt_carry':
      return `✌️ ${name} ran in a 2PT conversion`;

    case 'one_pt_pass': {
      const rec = findPaired('one_pt_rec');
      return rec
        ? `1️⃣ ${name} converted the PAT pass to #${rec.player_number} ${rec.player_name}`
        : `1️⃣ ${name} threw a PAT pass`;
    }
    case 'one_pt_rec': {
      const pass = findPaired('one_pt_pass');
      return pass ? null : `1️⃣ ${name} caught a PAT conversion`;
    }
    case 'one_pt_carry':
      return `1️⃣ ${name} ran in a 1PT conversion`;

    case 'reception':
      return `👐 ${name} made a reception`;
    case 'passing_yds':
      return `💫 ${name} threw for ${val} yards`;
    case 'rushing_yds':
      return `💨 ${name} ran for ${val} yards`;
    case 'receiving_yds':
      return `📡 ${name} caught for ${val} yards`;

    case 'tackle':
      return `💪 ${name} made a tackle`;
    case 'tackle_assist':
      return `🤝 ${name} assisted on a tackle`;
    case 'tfl':
      return `📉 ${name} made a tackle for loss`;
    case 'sack':
      return `🔨 ${name} sacked the quarterback`;
    case 'interception':
      return `🎯 ${name} picked off the pass`;
    case 'pbu':
      return `✋ ${name} broke up the pass`;
    case 'fumble_rec':
      return `💎 ${name} recovered the fumble`;
    case 'forced_fumble':
      return `💥 ${name} forced a fumble`;

    case 'kick_return_yds':
      return `🔄 ${name} returned the kick for ${val} yards`;
    case 'punt_return_yds':
      return `⬆️ ${name} returned the punt for ${val} yards`;
    case 'pat_kick':
      return `🦵 ${name} kicked the extra point`;
    case 'field_goal':
      return `🥅 ${name} made a field goal`;

    default:
      return `📊 ${name} — ${getStatInfo(stat.stat_type).label}`;
  }
}

export const POSITION_ALIASES = {
  'G': 'OG',
  'T': 'OT',
  'OT': 'OT',
  'OG': 'OG',
  'GUARD': 'OG',
  'TACKLE': 'OT',
  'CORNER': 'CB',
  'CORNERBACK': 'CB',
  'SAFETY': 'S',
  'LINEBACKER': 'LB',
  'RUNNING BACK': 'RB',
  'FULLBACK': 'FB',
  'WIDE RECEIVER': 'WR',
  'TIGHT END': 'TE',
  'QUARTERBACK': 'QB',
  'CENTER': 'C',
  'DEFENSIVE END': 'DE',
  'DEFENSIVE TACKLE': 'DT',
  'FREE SAFETY': 'FS',
  'STRONG SAFETY': 'SS',
  'MIDDLE LINEBACKER': 'MLB',
  'OUTSIDE LINEBACKER': 'OLB',
  'KICKER': 'K',
  'PUNTER': 'P',
  'LONG SNAPPER': 'LS',
};

export function normalisePosition(pos) {
  const upper = pos.trim().toUpperCase();
  return POSITION_ALIASES[upper] || pos.trim();
}