package pomgraph

import com.twitter.finagle.Service
import com.twitter.finagle.http.Method.{Get, Post}
import com.twitter.finagle.http.Status.{Created, NotFound, Ok}
import com.twitter.finagle.http.filter.Cors.{HttpFilter, UnsafePermissivePolicy}
import com.twitter.finagle.http.path.Root
import com.twitter.finagle.http.{Request, Response}
import com.twitter.util.Future
import io.fintrospect.formats.Json4s
import io.fintrospect.formats.Json4s.JsonFormat._
import io.fintrospect.formats.Json4s.ResponseBuilder.implicits._
import io.fintrospect.parameters.{Header, ParameterSpec, Path}
import io.fintrospect.{ApiKey, ModuleSpec, RouteSpec}
import io.github.configur8.Configuration

class PomgraphApp(database: Database, config: Configuration) {
  private def add(group: String, name: String, version: String) = Service.mk[Request, Response] {
    rq: Request =>
      database.add(VersionedModule(group, name, version), dependencies <-- rq)
        .map(_ => Created())
  }

  private def lookup(group: String, name: String, version: String) = Service.mk[Request, Response] {
    rq: Request =>
      database.lookup(VersionedModule(group, name, version))
        .flatMap(o => o.map(m => Ok(encode(m))).getOrElse(NotFound()).toFuture)
  }

  private val group = Path(ParameterSpec.string("group"))
  private val id = Path(ParameterSpec.string("id"))
  private val version = Path(ParameterSpec.string("version"))
  private val dependencies = Json4s.JsonFormat.body[Dependencies]()

  private val module = ModuleSpec(Root / "pomgraph")
    .securedBy(ApiKey[String, Request](Header.required.string("apiKey"), key => Future.value(key == config.valueOf(Settings.API_KEY))))
    .withRoute(RouteSpec("lookup").at(Get) / group / id / version bindTo lookup)
    .withRoute(RouteSpec("add")
      .body(dependencies).at(Post) / group / id / version bindTo add)

  val service = new HttpFilter(UnsafePermissivePolicy).andThen(module.toService)
}
