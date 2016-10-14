name := "pomgraph"

version := "1.0"

scalaVersion := "2.11.8"

libraryDependencies ++= Seq(
  "io.fintrospect" %% "fintrospect-core" % "13.9.1",
  "io.fintrospect" %% "fintrospect-json4s" % "13.9.1",
  "io.github.daviddenton" %% "configur8" % "1.1.3",
  "org.scalatest" %% "scalatest" % "2.2.4" % "test"
)

enablePlugins(JavaAppPackaging)
