import { ARCHETYPES, FACTIONS, type Archetype, type Faction } from '../types';
import { Character } from './characters';
import { checkFigures, FACTION_COLORS } from './registry';
import { Soldier } from './soldiers';

const cell: React.CSSProperties = {
  background: 'var(--parchment-strong)',
  border: '1px solid var(--parchment-edge)',
  borderRadius: 8,
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
};

const NAPO_F: Faction[] = ['francais', 'britanniques', 'autrichiens', 'prussiens', 'russes', 'espagnols', 'portugais', 'polonais'];
const NAPO_A: Archetype[] = ['empereur-napoleon', 'general', 'roi-moderne', 'tsar', 'diplomate', 'amiral'];
const SECTIONS: { title: string; factions: Faction[]; archetypes: Archetype[] }[] = [
  { title: 'Antiquité / Moyen Âge', factions: FACTIONS.filter((f) => !NAPO_F.includes(f)), archetypes: ARCHETYPES.filter((a) => !NAPO_A.includes(a)) },
  { title: 'Époque napoléonienne', factions: NAPO_F, archetypes: NAPO_A },
];

export function FiguresDemo() {
  const errors = checkFigures();
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'auto', background: 'var(--parchment)', color: 'var(--ink)', padding: 16, fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', margin: '0 0 8px' }}>Figurines (x2)</h1>
      {errors.length > 0 && <pre style={{ color: 'var(--accent)' }}>{errors.join('\n')}</pre>}
      {SECTIONS.map((sec) => (
        <section key={sec.title}>
          <h2 style={{ fontFamily: 'var(--font-serif)' }}>{sec.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {sec.factions.map((f) => (
              <div key={f} style={cell}>
                <strong style={{ color: FACTION_COLORS[f] }}>{f}</strong>
                <div style={{ display: 'flex', gap: 14 }}>
                  <Soldier faction={f} frame={0} width={64} height={80} />
                  <Soldier faction={f} frame={1} width={64} height={80} />
                  <div style={{ width: 80, height: 80, overflow: 'visible' }}>
                    <Soldier faction={f} frame={0} state="vaincu" width={64} height={80} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 10 }}>
            {sec.archetypes.map((a) => (
              <div key={a} style={cell}>
                <strong>{a}</strong>
                <Character archetype={a} width={72} height={96} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
