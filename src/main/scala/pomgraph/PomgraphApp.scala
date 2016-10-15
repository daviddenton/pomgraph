package pomgraph

import com.twitter.finagle.Service
import com.twitter.finagle.http.Method.{Get, Post}
import com.twitter.finagle.http.Status.{Created, NotFound, Ok}
import com.twitter.finagle.http.filter.Cors.{HttpFilter, UnsafePermissivePolicy}
import com.twitter.finagle.http.path.Root
import com.twitter.finagle.http.{Request, Response}
import com.twitter.util.Future
import io.fintrospect.parameters.{Header, ParameterSpec, Path}
import io.fintrospect.{ApiKey, ModuleSpec, RouteSpec}
import io.github.configur8.Configuration
import pomgraph.JsonLib.JsonFormat._
import pomgraph.JsonLib.ResponseBuilder.implicits._

class PomgraphApp(graph: DependencyGraph, config: Configuration) {

  private val group = Path(ParameterSpec.string("group"))
  private val id = Path(ParameterSpec.string("id"))
  private val version = Path(ParameterSpec.string("version"))
  private val dependencies = body[Set[VersionedPackage]]()

  private def add(group: String, name: String, version: String) = Service.mk[Request, Response] {
    rq: Request =>
      graph.add(VersionedPackage(Package(group, name), version), dependencies <-- rq)
        .map(_ => Created())
  }

  private def lookup(group: String, name: String, version: String) = Service.mk[Request, Response] {
    rq: Request =>
      graph.lookup(VersionedPackage(Package(group, name), version))
        .map(o => {
          val response = o.map(m => Ok(encode(m))).getOrElse(NotFound())
          response
        })
  }

  private val module = ModuleSpec(Root / "pomgraph")
    .securedBy(ApiKey[String, Request](Header.required.string("apiKey"), key => Future.value(key == config.valueOf(Settings.API_KEY))))
    .withRoute(RouteSpec("lookup").at(Get) / group / id / version bindTo lookup)
    .withRoute(RouteSpec("add")
      .body(dependencies).at(Post) / group / id / version bindTo add)

  val service = new HttpFilter(UnsafePermissivePolicy).andThen(module.toService)
}
