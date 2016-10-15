package pomgraph

import com.twitter.util.Future

import scala.collection.mutable

class InMemoryGraph extends DependencyGraph {

  private val graphs = mutable.Map[Package, mutable.Map[Version, Set[VersionedPackage]]]()

  private def internalLookup(versionedPackage: VersionedPackage): Option[VersionGraph] =
    graphs.get(versionedPackage.pkg)
      .flatMap(allVersions => allVersions.get(versionedPackage.version))
      .map(deps => VersionGraph(versionedPackage, deps.flatMap(internalLookup)))

  def lookup(versionedPackage: VersionedPackage) = Future.value(internalLookup(versionedPackage))

  def add(versionedPackage: VersionedPackage, dependencies: Set[VersionedPackage]) = {
    val dependencyGraph = graphs.getOrElseUpdate(versionedPackage.pkg, mutable.Map())
    val versionDependencies = dependencyGraph.getOrElseUpdate(versionedPackage.version, Set())
    dependencyGraph(versionedPackage.version) = versionDependencies ++ dependencies
    Future.value(())
  }

  override def dependentsOf(pkg: Package): Future[Option[Set[Package]]] = {
    Future.value(graphs.get(pkg).map(
      _ => graphs.foldLeft(Set.empty[Package]) {
        (memo, next) => if (next._2.exists(_._2.exists(_.pkg == pkg))) memo + next._1 else memo
      }
    ))
  }
}

