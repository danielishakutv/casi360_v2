import { Settings as SettingsIcon } from 'lucide-react'
import PagePlaceholder from '../components/PagePlaceholder'

export default function Settings() {
  return (
    <PagePlaceholder
      icon={SettingsIcon}
      title="System Settings"
      description="Configure system preferences, user roles and permissions, notification settings, integrations, and organization profile."
    />
  )
}
