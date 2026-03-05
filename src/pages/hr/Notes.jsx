import { StickyNote } from 'lucide-react'
import PagePlaceholder from '../../components/PagePlaceholder'

export default function Notes() {
  return (
    <PagePlaceholder
      icon={StickyNote}
      title="HR Notes"
      description="Create and manage HR notes, memos, and internal communications for your team."
    />
  )
}
