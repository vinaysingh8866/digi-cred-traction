// The default router for the Tenant UI backend
// Expand on this (or add other router files) if the TenantUI backend should do much more business actions
// other than serving the static files and proxying to Traction

import express, { Request, Response } from "express";
import config from "config";
import * as emailComponent from "../components/email";
import * as innkeeperComponent from "../components/innkeeper";
import * as databaseComponent from "../components/database";
import { body, validationResult } from "express-validator";
import { NextFunction } from "express";
import oidcMiddleware from "../middleware/oidcMiddleware";

export const router = express.Router();

router.use(express.json());

// For the secured innkeepr OIDC login request to verify the token and get a token from Traction
router.get(
  "/innkeeperLogin",
  oidcMiddleware,
  async (req: any, res: Response, next: NextFunction) => {
    try {
      // Validate JWT from OIDC login before moving on
      // The realm access check below is pretty Keycloak specific
      // It's a TODO later to see how this could be a more generic OIDC claim
      console.log(req.claims);
      if (
        req.claims.realm_access &&
        req.claims.realm_access.roles &&
        req.claims.realm_access.roles.includes(
          config.get("server.oidc.roleName")
        )
      ) {
        const result = await innkeeperComponent.login();
        res.status(200).send(result);
      } else {
        res.status(403).send();
      }
    } catch (error) {
      console.error(`Error logging in: ${error}`);
      next(error);
    }
  }
);

// Protected reservation endpoint
router.post(
  "/innkeeperReservation",
  async (req: any, res: Response, next: NextFunction) => {
    try {
      // Get innkeeper token from login method
      const { token } = await innkeeperComponent.login();

      const result = await innkeeperComponent.createReservation(req, token);
      res.status(201).send(result);
    } catch (error) {
      next(error);
    }
  }
);

// Email endpoint
router.post(
  "/email/reservationConfirmation",
  body("contactEmail").isEmail(),
  body("reservationId").not().isEmpty(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(422).json({ errors: errors.array() });
        return;
      }

      const result = await emailComponent.sendConfirmationEmail(req);
      res.send(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/email/reservationStatus",
  body("contactEmail").isEmail(),
  body("reservationId").not().isEmpty(),
  body("state").not().isEmpty(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(422).json({ errors: errors.array() });
        return
      }

      const result = await emailComponent.sendStatusEmail(req);
      res.send(result);
    } catch (error) {
      next(error);
    }
  }
);

// Database Items endpoints
router.get(
  "/items",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Router: Fetching items from database');
      const items = await databaseComponent.getAllItems();
      console.log('Router: Items fetched successfully');
      res.status(200).json(items);
    } catch (error: any) {
      console.error('Router: Error fetching items:', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        error: 'Database error',
        details: error.message,
        config: {
          host: process.env.POSTGRESQL_HOST || 'localhost',
          port: process.env.POSTGRESQL_PORT || '5432',
          database: process.env.POSTGRESQL_DB || 'askar-wallet'
        }
      });
      next(error);
    }
  }
);

// Profiles endpoint
router.get(
  "/profiles",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Router: Fetching profiles from database');
      const profiles = await databaseComponent.getAllProfiles();
      console.log('Router: Profiles fetched successfully');
      res.status(200).json(profiles);
    } catch (error: any) {
      console.error('Router: Error fetching profiles:', error);
      res.status(500).json({ error: 'Database error', details: error.message });
      next(error);
    }
  }
);

// Configuration endpoint
// router.get(
//   "/config",
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       console.log('Router: Fetching configuration from database');
//       const config = await databaseComponent.getConfiguration();
//       console.log('Router: Configuration fetched successfully');
//       res.status(200).json(config);
//     } catch (error: any) {
//       console.error('Router: Error fetching configuration:', error);
//       res.status(500).json({ error: 'Database error', details: error.message });
//       next(error);
//     }
//   }
// );

// Table data endpoint (for any table in postgres schema)
router.get(
  "/table/:tableName",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tableName = req.params.tableName;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      console.log(`Router: Fetching data from table: ${tableName}`);
      const data = await databaseComponent.getTableData(tableName, limit);
      res.status(200).json(data);
    } catch (error: any) {
      console.error('Router: Error fetching table data:', error);
      res.status(500).json({ error: 'Database error', details: error.message });
      next(error);
    }
  }
);

// Items by category endpoint
router.get(
  "/items/categories",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Router: Counting items by category');
      const categoryCounts = await databaseComponent.countItemsByCategory();
      console.log('Router: Categories counted successfully');
      res.status(200).json(categoryCounts);
    } catch (error: any) {
      console.error('Router: Error counting categories:', error);
      res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
      next(error);
    }
  }
);

// Items by profile and kind (for analysis)
router.get(
  "/items/analysis",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Router: Analyzing items by profile and kind');
      const analysis = await databaseComponent.getItemsByProfileAndKind();
      console.log('Router: Analysis completed successfully');
      res.status(200).json(analysis);
    } catch (error: any) {
      console.error('Router: Error analyzing items:', error);
      res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
      next(error);
    }
  }
);

// Count items by kind (type) summary
router.get(
  "/items/summary",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Router: Getting item type summary');
      const summary = await databaseComponent.countItemsByKind();
      console.log('Router: Summary generated successfully');
      res.status(200).json(summary);
    } catch (error: any) {
      console.error('Router: Error generating summary:', error);
      res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
      next(error);
    }
  }
);

