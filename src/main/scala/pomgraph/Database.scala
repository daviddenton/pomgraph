package pomgraph

import com.twitter.util.Future
import io.fintrospect.configuration.Port
import io.github.configur8.{ConfigurationTemplate, Property}

import scala.collection.mutable

object Settings {

  val API_KEY = Property.string("API_KEY")
  val PORT = Property.of[Port]("PORT", Port(_))

  val config = ConfigurationTemplate()
    .withProp(API_KEY, "password")
    .withProp(PORT, Port(5000))
}

class Database {

  private val graph = mutable.Map[VersionedModule, Dependencies]()

  def lookup(versionedModule: VersionedModule) = Future.value(graph.get(versionedModule))

  def add(versionedModule: VersionedModule, dependencies: Dependencies) = Future.value(graph(versionedModule) = dependencies)
}
