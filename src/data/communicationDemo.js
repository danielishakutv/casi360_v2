/* Demo data for communication pages */

let _id = 500

export function nextCommId() { return ++_id }

export const demoStaffList = [
  { id: 1, name: 'John Adebayo', email: 'john.adebayo@casi360.com', phone: '08012345678', department: 'Administration' },
  { id: 2, name: 'Fatima Yusuf', email: 'fatima.yusuf@casi360.com', phone: '08023456789', department: 'Finance' },
  { id: 3, name: 'Chinedu Okafor', email: 'chinedu.okafor@casi360.com', phone: '08034567890', department: 'Programs' },
  { id: 4, name: 'Amina Ibrahim', email: 'amina.ibrahim@casi360.com', phone: '08045678901', department: 'Human Resources' },
  { id: 5, name: 'David Mensah', email: 'david.mensah@casi360.com', phone: '08056789012', department: 'Procurement' },
  { id: 6, name: 'Grace Eze', email: 'grace.eze@casi360.com', phone: '08067890123', department: 'Programs' },
  { id: 7, name: 'Ibrahim Bello', email: 'ibrahim.bello@casi360.com', phone: '08078901234', department: 'Finance' },
  { id: 8, name: 'Ngozi Nwosu', email: 'ngozi.nwosu@casi360.com', phone: '08089012345', department: 'Administration' },
  { id: 9, name: 'Samuel Osei', email: 'samuel.osei@casi360.com', phone: '08090123456', department: 'IT' },
  { id: 10, name: 'Blessing Okoro', email: 'blessing.okoro@casi360.com', phone: '08001234567', department: 'Programs' },
  { id: 11, name: 'Yusuf Abdullahi', email: 'yusuf.abdullahi@casi360.com', phone: '08012340001', department: 'Procurement' },
  { id: 12, name: 'Esther Akinola', email: 'esther.akinola@casi360.com', phone: '08012340002', department: 'Human Resources' },
  { id: 13, name: 'Kofi Asante', email: 'kofi.asante@casi360.com', phone: '08012340003', department: 'Finance' },
  { id: 14, name: 'Mary Bassey', email: 'mary.bassey@casi360.com', phone: '08012340004', department: 'IT' },
  { id: 15, name: 'Tunde Ogunleye', email: 'tunde.ogunleye@casi360.com', phone: '08012340005', department: 'Administration' },
]

export const demoDepartments = [
  'Administration',
  'Finance',
  'Human Resources',
  'IT',
  'Procurement',
  'Programs',
  'Monitoring & Evaluation',
  'Communications',
  'Legal',
  'Operations',
]

export const demoNotices = [
  { id: 501, subject: 'Office Closure — Public Holiday', body: 'Please note that the office will be closed on Monday, March 23rd for the public holiday. All staff are expected to resume on Tuesday.', audience: 'general', recipients: [], departments: [], priority: 'high', created_at: '2026-03-15', status: 'sent' },
  { id: 502, subject: 'Monthly Staff Meeting', body: 'The monthly all-hands meeting will hold on Friday at 10:00 AM in the conference room.', audience: 'general', recipients: [], departments: [], priority: 'medium', created_at: '2026-03-12', status: 'sent' },
  { id: 503, subject: 'IT Maintenance Window', body: 'The IT team will be performing server maintenance this Saturday from 10 PM to 2 AM. Expect intermittent access.', audience: 'department', recipients: [], departments: ['IT', 'Administration'], priority: 'medium', created_at: '2026-03-10', status: 'sent' },
  { id: 504, subject: 'Expense Report Deadline', body: 'All expense reports for Q1 must be submitted by March 31st. Late submissions will not be processed.', audience: 'department', recipients: [], departments: ['Finance'], priority: 'high', created_at: '2026-03-08', status: 'sent' },
  { id: 505, subject: 'Welcome New Staff', body: 'Please join us in welcoming Kofi Asante and Mary Bassey who joined the Finance and IT teams respectively.', audience: 'general', recipients: [], departments: [], priority: 'low', created_at: '2026-03-05', status: 'sent' },
]

export const demoSmsMessages = [
  { id: 601, message: 'Reminder: Staff meeting tomorrow at 10 AM. Please be on time.', audience: 'general', recipients: [], departments: [], created_at: '2026-03-14', status: 'sent', delivery_count: 15 },
  { id: 602, message: 'Your leave request has been approved. Check your email for details.', audience: 'individual', recipients: [{ id: 3, name: 'Chinedu Okafor' }], departments: [], created_at: '2026-03-13', status: 'sent', delivery_count: 1 },
  { id: 603, message: 'Finance team: Please submit monthly reports by Friday.', audience: 'department', recipients: [], departments: ['Finance'], created_at: '2026-03-10', status: 'sent', delivery_count: 3 },
  { id: 604, message: 'Happy Birthday! Wishing you a wonderful day.', audience: 'individual', recipients: [{ id: 6, name: 'Grace Eze' }, { id: 9, name: 'Samuel Osei' }], departments: [], created_at: '2026-03-09', status: 'sent', delivery_count: 2 },
]

export const demoEmails = [
  { id: 701, subject: 'Monthly Report — February 2026', body: 'Please find attached the monthly report for February 2026. Kindly review and provide feedback by end of week.', audience: 'general', recipients: [], departments: [], created_at: '2026-03-15', status: 'sent' },
  { id: 702, subject: 'Project Update: Clean Water Initiative', body: 'Dear team, here is the latest update on the Clean Water Initiative project milestones and next steps.', audience: 'department', recipients: [], departments: ['Programs', 'Monitoring & Evaluation'], created_at: '2026-03-12', status: 'sent' },
  { id: 703, subject: 'Payroll Notification', body: 'March payroll has been processed. Please check your bank accounts.', audience: 'individual', recipients: [{ id: 2, name: 'Fatima Yusuf' }, { id: 7, name: 'Ibrahim Bello' }], departments: [], created_at: '2026-03-10', status: 'sent' },
  { id: 704, subject: 'Training Invitation: Data Analytics', body: 'You are invited to attend the Data Analytics training on March 25th. Please confirm attendance.', audience: 'department', recipients: [], departments: ['IT', 'Programs'], created_at: '2026-03-08', status: 'draft' },
]
