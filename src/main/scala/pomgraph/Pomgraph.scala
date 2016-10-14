package pomgraph

import com.twitter.finagle.Http
import com.twitter.util.Await

object Pomgraph {
  def main(args: Array[String]) {
    val config = Settings.config.reify()
    Await.ready(Http.serve(s":${config.valueOf(Settings.PORT).value}", new PomgraphApp(
      new Database, config
    ).service))
  }
}
