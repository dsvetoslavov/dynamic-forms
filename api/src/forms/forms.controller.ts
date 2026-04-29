import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { FormsService } from './forms.service';

@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  findAll() {
    return this.formsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.formsService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.formsService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.formsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.formsService.remove(id);
  }

  // Rules
  @Get(':formId/rules')
  findRules(@Param('formId') formId: string) {
    return this.formsService.findRulesByForm(formId);
  }

  @Post(':formId/rules')
  createRule(@Param('formId') formId: string, @Body() body: any) {
    return this.formsService.createRule({ ...body, formId });
  }

  @Delete(':formId/rules/:ruleId')
  removeRule(@Param('ruleId') ruleId: string) {
    return this.formsService.removeRule(ruleId);
  }
}
