import { Router } from 'express';
import paginationValidator from '../pagination/pagination.validator.js';
import RepositoryRepository from '../repositories/repository.repository.js';
import ScanRepository from '../repositories/scan.repository.js';
import VulnerabilityRepository from '../repositories/vulnerability.repository.js';
import ApiResponse from '../utils/apiResponse.js';
import { asynchandler } from '../utils/asyncHandler.js';
import { verifyJwt } from '../middleware/auth.middleware.js';
import { requireWorkspaceAccess } from '../middleware/workspace.middleware.js';

const router = Router();

router.use(verifyJwt);
router.use(paginationValidator);

router.get('/repositories/:workspaceId', asynchandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { limit, cursor } = req.pagination;

  const result = await RepositoryRepository.listByWorkspace({ workspaceId, cursor, limit });

  return res.status(200).json(new ApiResponse(200, result, 'Repositories fetched successfully.'));
}));

router.get('/scans/:repositoryId', asynchandler(async (req, res) => {
  const { repositoryId } = req.params;
  const { limit, cursor } = req.pagination;

  const result = await ScanRepository.listByRepository({ repositoryId, cursor, limit });

  return res.status(200).json(new ApiResponse(200, result, 'Scans fetched successfully.'));
}));

router.get('/vulnerabilities/:scanId', asynchandler(async (req, res) => {
  const { scanId } = req.params;
  const { limit, cursor } = req.pagination;

  const result = await VulnerabilityRepository.listByScan({ scanId, cursor, limit });

  return res.status(200).json(new ApiResponse(200, result, 'Vulnerabilities fetched successfully.'));
}));

export default router;
