import { TopicGeneration } from '../components/TopicGeneration'
import { TopicWorkspace } from '../components/TopicWorkspace'
import { useAppStore } from '../store'

export function Workbench() {
  const generating = useAppStore((state) => state.generating)
  return generating ? <TopicGeneration /> : <TopicWorkspace />
}
