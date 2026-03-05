import { Mail } from 'lucide-react'
import PagePlaceholder from '../../components/PagePlaceholder'

export default function SendEmail() {
  return (
    <PagePlaceholder
      icon={Mail}
      title="Send Email"
      description="Compose and send emails to staff, departments, donors, or custom recipient lists with templates support."
    />
  )
}
