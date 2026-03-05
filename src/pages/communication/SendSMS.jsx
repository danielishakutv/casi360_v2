import { Smartphone } from 'lucide-react'
import PagePlaceholder from '../../components/PagePlaceholder'

export default function SendSMS() {
  return (
    <PagePlaceholder
      icon={Smartphone}
      title="Send SMS"
      description="Send SMS messages to individuals or groups. Manage SMS templates and track delivery status."
    />
  )
}
