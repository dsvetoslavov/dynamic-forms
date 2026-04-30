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
import { CreateFormDto, UpdateFormDto } from './dto';

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
  create(@Body() body: CreateFormDto) {
    return this.formsService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateFormDto) {
    return this.formsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.formsService.remove(id);
  }

}
