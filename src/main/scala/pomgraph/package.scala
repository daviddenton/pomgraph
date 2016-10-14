

package object pomgraph {
  type Group = String
  type ModuleId = String
  type Version = String
  type Dependencies = Set[VersionedModule]

  case class VersionedModule(group: Group, id: ModuleId, version: Version)

}


