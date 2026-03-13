import { createContext, useContext, useState } from 'react';
import Modal from '../components/shared/Modal';

const HelpContext = createContext(null);

export function useHelp() {
  return useContext(HelpContext);
}

export function HelpProvider({ children }) {
  const [helpModal, setHelpModal] = useState(false);

  return (
    <HelpContext.Provider value={{ openHelp: () => setHelpModal(true) }}>
      {children}
      {helpModal && (
        <Modal title="Help & Info" onClose={() => setHelpModal(false)} wide>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--gray-100)' }}>
            <p style={{ color: 'var(--gray-300)', marginBottom: 20 }}>Gridiron Stats helps you track player performance across your American Football season. Here's a quick overview of what you can do.</p>
            {[
              { title: 'Teams', body: "Create a team to get started. You'll be the admin and get two share codes — a Join Code for coaches and players who need to log stats, and a View Code for anyone who just wants to follow along. Share these via the 🔗 Share Codes button on the My Teams page." },
              { title: 'Players', body: 'Add your roster manually or import via CSV. You can set jersey numbers, positions, and mark players as active or inactive. Inactive players are hidden from the stat logging screen.' },
              { title: 'Games', body: "Schedule your games in advance, then tap through to a game to log stats live. You can update the score at any time and mark the game type — regular, friendly, playoff, or finals. Friendly games don't count toward the season leaderboard." },
              { title: 'Logging Stats', body: 'On the game screen, tap ⚡ Log Stat to quickly log a play. Choose the stat type first, then select the player. Or tap a player directly from the roster to log a stat for them. You can optionally attach a play and add notes to each stat.' },
              { title: 'Plays', body: 'Admins can define a playbook under the Plays tab. Plays are split into offense and defense, and when logging stats the relevant plays are automatically filtered. Plays are tied to a season so you can build a new playbook each year.' },
              { title: 'Leaderboard', body: 'The Leaderboard tab shows season totals for every player across all non-friendly games. Use the CSV export to download a full stats spreadsheet.' },
              { title: 'Exporting', body: "Admins can export a game stat sheet as a PDF from the bottom of any game page, and a full player report PDF from each player's profile page." },
            ].map(({ title, body }) => (
              <div key={title} style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{title}</div>
                <p style={{ color: 'var(--gray-300)', margin: 0 }}>{body}</p>
              </div>
            ))}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>Roles</div>
              {[
                { role: 'Admin', desc: 'Full access including managing players, logging stats, and exporting' },
                { role: 'Member', desc: "Can log stats but can't manage the roster or settings" },
                { role: 'Viewer', desc: 'Read-only access, great for parents and supporters' },
              ].map(({ role, desc }) => (
                <div key={role} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <span className="tag tag-gold" style={{ flexShrink: 0 }}>{role}</span>
                  <span style={{ color: 'var(--gray-300)', fontSize: '0.88rem', alignSelf: 'center' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={() => setHelpModal(false)}>Got it</button>
          </div>
        </Modal>
      )}
    </HelpContext.Provider>
  );
}