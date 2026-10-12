import { StudentDashboard } from '@/components/student-dashboard';
import { getStudentDashboard } from '@/lib/dashboard-data';

export default async function DashboardPage() {
  const data = await getStudentDashboard();
  return <StudentDashboard data={data} />;
}
