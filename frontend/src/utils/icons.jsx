import React from 'react';

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "stat-icon-svg",
};

const footballPaths = (
  <>
    <path d="M23.248 3.85a2.991 2.991 0 0 0 -3.1 -3.1c-3.67 0.14 -9.889 1.05 -14.117 5.281S0.891 16.474 0.752 20.15a2.991 2.991 0 0 0 3.1 3.1c3.675 -0.138 9.894 -1.05 14.122 -5.279S23.109 7.526 23.248 3.85Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
    <path d="m15.75 8.25 -7.5 7.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
    <path d="m10.875 10.875 2.25 2.25" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
    <path d="m8.25 13.5 2.25 2.25" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
    <path d="m13.5 8.25 2.25 2.25" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
    <path d="m1.426 14.926 7.648 7.648" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
    <path d="m22.574 9.074 -7.648 -7.648" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
  </>
);

export function getStatIcon(key, size = 16) {
  const p = { ...iconProps, width: size, height: size };
  
  switch (key) {
    // Offense
    case 'td_passing':    return <svg {...p}>{footballPaths}</svg>;
    case 'td_receiving':  return <svg {...p}>{footballPaths}</svg>;
    case 'td_rushing':    return <svg {...p}>{footballPaths}</svg>;
    case 'receiving_yds': return <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
    case 'rushing_yds':   return <svg {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
    case 'passing_yds':   return <svg {...p}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
    case 'reception':     return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
    case 'two_pt_pass':   return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
    case 'two_pt_rec':    return <svg {...p}><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>;
    case 'two_pt_carry':  return <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
    case 'one_pt_pass':   return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/></svg>;
    case 'one_pt_rec':    return <svg {...p}><polyline points="17 11 12 6 7 11"/></svg>;
    case 'one_pt_carry':  return <svg {...p}><polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/></svg>;

    // Defense
    case 'tackle':        return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
    case 'tackle_assist': return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'tfl':           return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
    case 'sack':          return <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
    case 'interception':  return <svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'pbu':           return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case 'td_return':     return <svg {...p}><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>;
    case 'return_2pt':    return <svg {...p}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
    case 'return_1pt':    return <svg {...p}><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>;
    case 'fumble_rec':    return <svg {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;
    case 'forced_fumble': return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

    // Special Teams
    case 'kick_return_yds': return <svg {...p}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>;
    case 'punt_return_yds': return <svg {...p}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
    case 'pat_kick':        return <svg {...p} strokeWidth="1.5"><path d="m4.75 2.5 0 12 13.5 0 0 -12"/><path d="m11.5 14.5 0 7.5"/><path d="M9.7871280824 8.9964371123a3.001 1.875 -52.882 1 0 3.6219580752 -4.7859611053 3.001 1.875 -52.882 1 0 -3.6219580752 4.7859611053Z"/></svg>;
    case 'field_goal':      return <svg {...p} strokeWidth="1.5"><path d="m4.75 2.5 0 12 13.5 0 0 -12"/><path d="m11.5 14.5 0 7.5"/><path d="M9.7871280824 8.9964371123a3.001 1.875 -52.882 1 0 3.6219580752 -4.7859611053 3.001 1.875 -52.882 1 0 -3.6219580752 4.7859611053Z"/></svg>;

    case 'comp_pct':      return <svg {...p}><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>;

    // Default
    default: return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>;
  }
}