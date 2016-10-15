package pomgraph

import io.fintrospect.configuration.Port
import io.github.configur8.{ConfigurationTemplate, Property}

object Settings {

  val API_KEY = Property.string("API_KEY")
  val PORT = Property.of[Port]("PORT", Port(_))

  val config = ConfigurationTemplate()
    .withProp(API_KEY, "pomword")
    .withProp(PORT, Port(5000))
}
