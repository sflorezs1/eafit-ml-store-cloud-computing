import express from 'express';
import { getModels, getModelsById, getS3PutUrl, createModelTest, getModelTest } from '../controller/modelController.js';

const router = express.Router()

router.route('/').get(getModels)

router.route('/:id').get(getModelsById)

router.route('/:id/getS3PutUrl').get(getS3PutUrl)

router.route('/:id/test/:executionId').post(createModelTest)

router.route('/:id/test/:executionId').get(getModelTest)

export default router