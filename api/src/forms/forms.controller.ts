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
import { CreateFormDto, UpdateFormDto, FormResponseDto } from './dto';
import { Form } from './entities/form.entity';

function toFormResponse(form: Form): FormResponseDto {
  return {
    id: form.id,
    name: form.name,
    description: form.description,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
    questions: form.questions?.map((q) => ({
      id: q.id,
      type: q.type,
      label: q.label,
      order: q.order,
      required: q.required,
      config: q.config,
      createdAt: q.createdAt,
    })) ?? [],
  };
}

@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  async findAll(): Promise<FormResponseDto[]> {
    const forms = await this.formsService.findAll();
    return forms.map(toFormResponse);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<FormResponseDto> {
    const form = await this.formsService.findOne(id);
    return toFormResponse(form);
  }

  @Post()
  async create(@Body() body: CreateFormDto): Promise<FormResponseDto> {
    const form = await this.formsService.create(body);
    return toFormResponse(form);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateFormDto): Promise<FormResponseDto> {
    const form = await this.formsService.update(id, body);
    return toFormResponse(form);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.formsService.remove(id);
  }
}
