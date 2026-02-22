import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import {
  LegalContractService,
  GenerateFromTemplateDto,
  AddSignatoryDto,
  ConfirmSignatureDto,
  UpdateCustomConditionsDto,
} from './legal-contract.service';

@ApiTags('Legal Contracts')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('legal-contract')
export class LegalContractController {
  constructor(private readonly service: LegalContractService) {}

  /**
   * POST /legal-contract
   * Rule 3: Contracts may ONLY be created from a Template (Temple origin).
   * Pulls bankRequisites + legalAddress from body (client pre-fills from UserProfile).
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a new contract from a Temple template (Rule 3 — origin enforcement)' })
  generateFromTemplate(@Body() dto: GenerateFromTemplateDto) {
    return this.service.generateFromTemplate(dto);
  }

  /**
   * GET /legal-contract/templates
   * List all active ContractTemplates (for oath/signing ceremony UI).
   */
  @Get('templates')
  @ApiOperation({ summary: 'List all active contract templates from the Temple of Heaven' })
  @ApiQuery({ name: 'source', required: false })
  listTemplates(@Query('source') source?: string) {
    return this.service.listTemplates(source);
  }

  /**
   * GET /legal-contract/:id
   * Full contract details including all signatories and snapshot.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get contract details with signatories and archive status' })
  getContractDetails(@Param('id') id: string) {
    return this.service.getContractDetails(id);
  }

  /**
   * GET /legal-contract/:id/trace
   * Legal Graph: parties + signatories as nodes + edges (frontend visualization).
   */
  @Get(':id/trace')
  @ApiOperation({ summary: 'Legal Graph: nodes+edges for contract visualization' })
  getLegalTrace(@Param('id') id: string) {
    return this.service.getLegalTrace(id);
  }

  /**
   * POST /legal-contract/:id/signatory
   * Rule 1: SUM(mediator feePercent) ≤ 1.00%
   * Rule 2: notaryRank ≥ contract.requiredRank
   */
  @Post(':id/signatory')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a signatory (NOTARY/LAWYER/MEDIATOR) — Rules 1 & 2 enforced' })
  addSignatory(@Param('id') id: string, @Body() dto: AddSignatoryDto) {
    return this.service.addSignatory(id, dto);
  }

  /**
   * POST /legal-contract/:id/sign
   * Confirm signature for a signatory — generates per-signatory SHA-256 hash.
   */
  @Post(':id/sign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm signature — generates SHA-256 signatureHash' })
  confirmSignature(@Param('id') id: string, @Body() dto: ConfirmSignatureDto) {
    return this.service.confirmSignature(id, dto);
  }

  /**
   * PATCH /legal-contract/:id/conditions
   * Rule 3: Only a LAWYER signatory may update customConditions.
   * bankRequisites and legalAddress are immutable.
   */
  @Patch(':id/conditions')
  @ApiOperation({ summary: 'Update customConditions — LAWYER only (Rule 3)' })
  updateCustomConditions(
    @Param('id') id: string,
    @Body() dto: UpdateCustomConditionsDto,
  ) {
    return this.service.updateCustomConditions(id, dto);
  }

  /**
   * POST /legal-contract/:id/activate
   * Rule 4: ACTIVE only when ≥1 LAWYER + ≥1 ranked NOTARY + ALL MEDIATORs confirmed.
   */
  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate contract — Rule 4: requires ≥1 LAWYER + ≥1 ranked NOTARY + all MEDIATORs confirmed',
  })
  tryActivate(@Param('id') id: string) {
    return this.service.tryActivate(id);
  }

  /**
   * POST /legal-contract/:id/revoke
   */
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a contract' })
  revokeContract(@Param('id') id: string, @Body('reason') reason: string) {
    return this.service.revokeContract(id, reason);
  }

  /**
   * POST /legal-contract/:id/archive
   * Manually archive a COMPLETED contract → immutable TempleSnapshot.
   */
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive contract → Temple of Heaven TempleSnapshot (immutable)' })
  archiveContract(@Param('id') id: string) {
    return this.service.archiveContract(id);
  }
}
