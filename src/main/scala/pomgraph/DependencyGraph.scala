package pomgraph

import com.twitter.util.Future

trait DependencyGraph {
  def dependentsOf(pkg: Package): Future[Option[Set[Package]]]

  def lookup(versionedPackage: VersionedPackage): Future[Option[VersionGraph]]

  def add(versionedPackage: VersionedPackage, dependencies: Set[VersionedPackage]): Future[Unit]
}
