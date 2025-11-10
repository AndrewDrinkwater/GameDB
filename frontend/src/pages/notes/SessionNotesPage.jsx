import { NotebookPen, Sparkles } from 'lucide-react'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import './NotesPage.css'

export default function SessionNotesPage() {
  const { selectedCampaign } = useCampaignContext()

  const campaignName = selectedCampaign?.name ?? ''

  return (
    <div className="notes-page">
      <div className="notes-header">
        <div className="notes-title">
          <h1>Session Notes</h1>
          <p>
            Keep track of what happened in each session, highlight important
            moments, and capture quick reminders for your next game night.
          </p>
        </div>
      </div>

      <div className="notes-placeholder">
        <NotebookPen size={48} />
        <h2>Session notes are coming soon</h2>
        {campaignName ? (
          <p>
            You&apos;re viewing the <strong>{campaignName}</strong> campaign. We&apos;re
            working on collaborative session note tools tailored for your party.
          </p>
        ) : (
          <p>
            Select a campaign from the header to prepare dedicated session notes
            for your table.
          </p>
        )}
        <p>
          <Sparkles size={18} /> Stay tuned for rich text notes, agendas, and
          summaries shared with your players.
        </p>
      </div>
    </div>
  )
}
