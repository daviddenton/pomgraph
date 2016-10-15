import io.fintrospect.formats.Json4s

package object pomgraph {
  val JsonLib = Json4s

  type Group = String
  type PackageId = String
  type Version = String

  case class Package(group: Group, id: PackageId)

  case class VersionGraph(version: VersionedPackage, dependencies: Set[VersionGraph] = Set())

  case class VersionedPackage(pkg: Package, version: Version)

}
