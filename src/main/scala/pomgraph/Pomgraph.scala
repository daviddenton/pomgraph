package pomgraph

import com.twitter.finagle.Http
import com.twitter.util.Await

object Pomgraph {
  def main(args: Array[String]) {
    val config = Settings.config.reify()
    val graph = new InMemoryGraph
    Await.ready(Http.serve(s":${config.valueOf(Settings.PORT).value}", new PomgraphApp(graph, config).service))
  }
}
