package pomgraph

import com.twitter.util.Await.result
import org.scalatest.{BeforeAndAfterAll, FunSpec, Matchers}

trait GraphBehaviourSpec extends FunSpec with Matchers with BeforeAndAfterAll {
  val graph: DependencyGraph

  import TestData._

  override protected def beforeAll(): Unit = {
    graph.add(A.v1, Set())
    graph.add(B.v1, Set(A.v1))
    graph.add(C.v1, Set(A.v1, B.v1))
    graph.add(A.v2, Set())
    graph.add(A.v3, Set())
    graph.add(B.v2, Set(A.v1))
    graph.add(C.v2, Set(A.v2, B.v1))
    graph.add(C.v3, Set(A.v3, B.v2))
    graph.add(D.v1, Set(C.v3, A.v1))
  }

  describe(graph.getClass.getSimpleName) {
    describe("lookup graph") {
      it("returns graph for a known package") {
        result(graph.lookup(C.v3)) shouldBe Option(
          VersionGraph(C.v3, Set(
            VersionGraph(A.v3),
            VersionGraph(B.v2, Set(VersionGraph(A.v1)))
          ))
        )
      }

      it("returns nothing if package unknown") {
        result(graph.lookup(VersionedPackage(C.pkg, "4"))) shouldBe None
      }
    }

    describe("get all dependant packages") {
      it("returns set for a known package") {
        result(graph.dependentsOf(A.pkg)) shouldBe Option(
          Set(B.pkg, C.pkg, D.pkg)
        )
      }

      it("returns nothing if package unknown") {
        result(graph.dependentsOf(Package("com", "a"))) shouldBe None
      }
    }
  }
}
