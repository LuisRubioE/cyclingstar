import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchTeamControl } from '../api/browse'
import { Panel, SectionBar } from '../components/Panel'
import { RaceEntry } from './RaceEntry'
import { TeamCalendar } from './TeamCalendar'

/**
 * "Races": una sola entrada que se adapta a tu situación. Si diriges un equipo, planificas su
 * calendario (a qué carreras irá). Si eres agente libre, te inscribes a carreras continentales. Si
 * corres para un equipo que no gestionas, tus convocatorias las decide el equipo (las ves en My rider).
 */
export function MyRaces() {
  const control = useQuery({ queryKey: ['team-control'], queryFn: fetchTeamControl })
  if (control.isPending) return <p className="text-slate-500">Loading…</p>

  const team = control.data?.team
  if (team?.ownedByMe) return <TeamCalendar />
  if (team) {
    return (
      <section className="space-y-4">
        <SectionBar>Races</SectionBar>
        <Panel title="Your team picks your races">
          <p className="text-sm text-slate-600">
            {team.name} decides which races you ride. Your upcoming entries appear on your{' '}
            <Link to="/rider" className="font-medium text-indigo-600 hover:underline">
              My rider
            </Link>{' '}
            page, about two weeks before each start.
          </p>
        </Panel>
      </section>
    )
  }
  return <RaceEntry />
}
