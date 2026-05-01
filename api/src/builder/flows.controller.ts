import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { FlowsService } from './flows.service';
import { CreateFlowDto, UpdateFlowDto, FlowResponseDto, FlowDetailResponseDto } from './dto';
import { Flow } from './entities/flow.entity';

function toFlowResponse(flow: Flow): FlowResponseDto {
  return {
    id: flow.id,
    name: flow.name,
    description: flow.description,
    createdAt: flow.createdAt,
    updatedAt: flow.updatedAt,
  };
}

function toFlowDetailResponse(flow: Flow): FlowDetailResponseDto {
  return {
    id: flow.id,
    name: flow.name,
    description: flow.description,
    forms: flow.flowForms
      ?.sort((a, b) => a.order - b.order)
      .map((ff) => ({ id: ff.formId, name: ff.form.name, order: ff.order })) ?? [],
    rules: flow.rules?.map((r) => ({
      id: r.id,
      flowId: r.flowId,
      sourceQuestionId: r.sourceQuestionId,
      triggerValue: r.triggerValue,
      targetQuestionId: r.targetQuestionId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })) ?? [],
    createdAt: flow.createdAt,
    updatedAt: flow.updatedAt,
  };
}

@Controller('flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Get()
  async findAll(): Promise<FlowResponseDto[]> {
    const flows = await this.flowsService.findAll();
    return flows.map(toFlowResponse);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<FlowDetailResponseDto> {
    const flow = await this.flowsService.findOne(id);
    return toFlowDetailResponse(flow);
  }

  @Post()
  async create(@Body() body: CreateFlowDto): Promise<FlowResponseDto> {
    const flow = await this.flowsService.create(body);
    return toFlowResponse(flow);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateFlowDto): Promise<FlowDetailResponseDto> {
    const flow = await this.flowsService.update(id, body);
    return toFlowDetailResponse(flow);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.flowsService.remove(id);
  }
}
