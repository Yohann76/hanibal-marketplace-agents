package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"marketplace-oc-agents/db"
	"marketplace-oc-agents/handlers"
)

func main() {
	if err := db.Connect(); err != nil {
		log.Printf("warning: could not connect to database: %v", err)
	}

	app := fiber.New()
	app.Use(cors.New())
	app.Use(logger.New())

	api := app.Group("/api")
	api.Get("/agents", handlers.ListAgents)
	api.Get("/agents/:id", handlers.GetAgent)
	api.Post("/agents/:id/run", handlers.RunAgent)
	api.Get("/config", handlers.GetConfig)
	api.Get("/gmail/auth", handlers.GmailAuthStart)
	api.Get("/gmail/callback", handlers.GmailAuthCallback)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Fatal(app.Listen(":" + port))
}
