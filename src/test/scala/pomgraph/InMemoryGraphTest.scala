package pomgraph

class InMemoryGraphTest extends GraphBehaviourSpec {
  override lazy val graph = new InMemoryGraph()
}
