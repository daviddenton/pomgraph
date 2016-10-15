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

  override def weight(versionedPackage: VersionedPackage): Future[Option[Int]] = {
    def weigh(acc: Int, graph: VersionGraph, seen: Set[Package]): Int =
      if (graph.dependencies.isEmpty) acc
      else {
        val result = acc + graph.dependencies
          .filter(g => !seen.contains(g.version.pkg))
          .foldLeft(0) {
            (acc, g) => acc + weigh(1, g, seen + g.version.pkg)
          }

        println(versionedPackage + " = " + result)
        result
      }

    Future.value(internalLookup(versionedPackage).map(g => weigh(0, g, Set.empty)))
  }
}

