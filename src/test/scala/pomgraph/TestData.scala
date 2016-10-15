package pomgraph

object TestData {

  object Version {
    val one = "1"
    val two = "2"
    val three = "3"
  }

  object A {
    val pkg = Package("org", "a")
    val v1 = VersionedPackage(A.pkg, Version.one)
    val v2 = VersionedPackage(A.pkg, Version.two)
    val v3 = VersionedPackage(A.pkg, Version.three)
  }

  object B {
    val pkg = Package("io", "b")
    val v1 = VersionedPackage(B.pkg, Version.one)
    val v2 = VersionedPackage(B.pkg, Version.two)
    val v3 = VersionedPackage(B.pkg, Version.three)
  }

  object C {
    val pkg = Package("com", "c")
    val v1 = VersionedPackage(C.pkg, Version.one)
    val v2 = VersionedPackage(C.pkg, Version.two)
    val v3 = VersionedPackage(C.pkg, Version.three)
  }


  object D {
    val pkg = Package("io", "d")
    val v1 = VersionedPackage(D.pkg, Version.one)
    val v2 = VersionedPackage(D.pkg, Version.two)
    val v3 = VersionedPackage(D.pkg, Version.three)
  }

}
