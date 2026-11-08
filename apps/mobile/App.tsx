import { StatusBar } from 'expo-status-bar';
import { useHashRoute } from './src/navigation';
import { LiveScreen } from './src/screens/LiveScreen';
import { MissionsScreen } from './src/screens/MissionsScreen';
import { PlannerScreen } from './src/screens/PlannerScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { StoreProvider } from './src/state/store';

function Router() {
  const { route, navigate } = useHashRoute();
  switch (route.name) {
    case 'plan':
      return <PlannerScreen key={route.id} id={route.id} navigate={navigate} />;
    case 'live':
      return <LiveScreen key={route.id} id={route.id} navigate={navigate} />;
    case 'report':
      return <ReportScreen key={route.id} id={route.id} navigate={navigate} />;
    default:
      return <MissionsScreen navigate={navigate} />;
  }
}

export default function App() {
  return (
    <StoreProvider>
      <Router />
      <StatusBar style="auto" />
    </StoreProvider>
  );
}
