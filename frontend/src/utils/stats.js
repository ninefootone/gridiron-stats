export const STAT_CATEGORIES = {
  offense: {
    label: 'Offense',
    color: '#f5a623',
    stats: [
      { key: 'td_passing',     label: 'Passing TD',         icon: '🏈', unit: null,   description: 'Touchdown pass (QB)' },
      { key: 'td_receiving',   label: 'Receiving TD',       icon: '🙌', unit: null,   description: 'Touchdown catch (WR/TE/RB)', excludeFromStatFirst: true },
      { key: 'td_rushing',     label: 'Rushing TD',         icon: '🏃', unit: null,   description: 'Touchdown run (RB/QB)' },
      { key: 'receiving_yds',  label: 'Receiving Yards',    icon: '📡', unit: 'yds',  description: 'Yards after catch' },
      { key: 'rushing_yds',    label: 'Rushing Yards',      icon: '💨', unit: 'yds',  description: 'Yards run' },
      { key: 'passing_yds',    label: 'Passing Yards',      icon: '💫', unit: 'yds',  description: 'Yards thrown' },
      { key: 'reception',      label: 'Reception',          icon: '👐', unit: null,   description: 'Catch made' },
      { key: 'two_pt_pass',    label: '2PT Conv Pass',           icon: '✌️', unit: null,   description: '2-pt conversion pass (QB)' },
      { key: 'two_pt_rec',     label: '2PT Conv Reception', icon: '🤲', unit: null,   description: '2-pt conversion catch', excludeFromStatFirst: true },
      { key: 'two_pt_carry',   label: '2PT Conv Carry',     icon: '💪', unit: null,   description: '2-pt conversion run' },
      { key: 'one_pt_pass',    label: '1PT Conv Pass',           icon: '1️⃣', unit: null,   description: '1-pt conversion pass (QB)' },
      { key: 'one_pt_rec',     label: '1PT Conv Reception', icon: '☝️', unit: null,   description: '1-pt conversion catch', excludeFromStatFirst: true },
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
      { key: 'td_return',      label: 'Return TD',          icon: '🏆', unit: null,   description: 'Defensive/special teams return TD' },
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

export const ALL_STATS = Object.entries(STAT_CATEGORIES).flatMap(([key, c]) => c.stats.map(s => ({ ...s, category: key })));
export const COUNTING_STATS = ALL_STATS.filter(s => s.unit === null);

export function getStatInfo(key) {
  return ALL_STATS.find(s => s.key === key) || { key, label: key, icon: '📊', unit: null };
}

export const POSITIONS = [
  'QB', 'RB', 'FB', 'WR', 'TE', 'OL', 'OT', 'OG', 'C',
  'DL', 'DE', 'DT', 'LB', 'MLB', 'OLB', 'CB', 'S', 'FS', 'SS',
  'K', 'P', 'LS', 'KR', 'PR',
  'Defense', 'Offense',
];

export function getStatNarrative(stat, allStats) {
  const name = `#${stat.player_number} ${stat.player_name}`;
  const val = stat.value;

  // Find a paired stat (same game, logged within 3 seconds)
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