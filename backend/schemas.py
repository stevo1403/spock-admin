from typing import Optional

from marshmallow import Schema, fields
from marshmallow import validates, ValidationError
from marshmallow_enum import EnumField
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow.decorators import post_load

from backend.models import ContentType, Content, Campaign

# region Base Schemas

class BaseRequestSchema(Schema):
    pass

class BaseResponseSchema(Schema):
    pass

# region Content Schemas

class ContentBaseSchema(Schema):
    content_type = fields.String(required=True)
    
    title = fields.String(required=True)
    subtitle = fields.String(allow_none=True)
    description = fields.String(allow_none=True)
        
    button_text = fields.String(allow_none=True)
    button_link = fields.String(allow_none=True)
    
    start_date = fields.DateTime(allow_none=True)
    end_date = fields.DateTime(allow_none=True)
    
    image_filename = fields.String(allow_none=True)
    image_path = fields.String(allow_none=True)
    
    image_url = fields.String(allow_none=True)
    external_url = fields.String(allow_none=True)

    order = fields.Integer(allow_none=True)
    campaign_id = fields.Integer(allow_none=True)
    
    @post_load
    def make_content(self, data, **kwargs):
        return data
    
    class Meta:
        ordered = True

class ContentSchema(ContentBaseSchema):
    id = fields.Integer(required=True)

    @classmethod
    def from_orm(cls, content: Content):
        return cls().load(
            data=dict(
                id=content.id,
                title=content.title,
                subtitle=content.subtitle,
                content_type=content.content_type.value,
                description=content.description,
                button_text=content.button_text,
                button_link=content.button_link,
                start_date=content.start_date,
                end_date=content.end_date,
                order=content.order,
                image_url=content.image_url,
                external_url=content.external_url,
                campaign_id=content.campaign_id,
            )
        )
    
class ContentCreateRequest(BaseRequestSchema):
    title = fields.String(required=True, allow_none=False)
    subtitle = fields.String(allow_none=True)

    content_type = fields.String(required=True)
    
    description = fields.String(allow_none=True)
    
    button_text = fields.String(allow_none=True)
    button_link = fields.String(allow_none=True)
    
    start_date = fields.DateTime(allow_none=True)
    end_date = fields.DateTime(allow_none=True)

    external_url = fields.String(allow_none=True)
    
    order = fields.Integer(allow_none=False)
    campaign_id = fields.Integer(allow_none=False)

    class Meta:
        ordered = True

    @validates('content_type')
    def validate_content_type(self, value, data_key):
        if value not in ContentType._value2member_map_:
            raise ValidationError(f"Invalid content_type '{value}'. Must be one of: {[e.value for e in ContentType]}")


class ContentUpdateRequest(ContentBaseSchema, BaseRequestSchema):
    title = fields.String(required=False, allow_none=True)
    subtitle = fields.String(allow_none=True)

    content_type = fields.String(required=False)

    description = fields.String(allow_none=True)

    button_text = fields.String(allow_none=True)
    button_link = fields.String(allow_none=True)

    start_date = fields.DateTime(allow_none=True)
    end_date = fields.DateTime(allow_none=True)

    external_url = fields.String(allow_none=True)

    order = fields.Integer(allow_none=True)

    class Meta:
        ordered = True

    @validates('content_type')
    def validate_content_type(self, value, data_key):
        if value not in ContentType._value2member_map_:
            raise ValidationError(f"Invalid content_type '{value}'. Must be one of: {[e.value for e in ContentType]}")



class ContentResponse(BaseResponseSchema):
    content = fields.Nested(ContentSchema)

    class Meta:
        ordered = True

class UploadResponse(Schema):
    message = fields.String(required=True)
    filename = fields.String(required=True)
    path = fields.String(required=True)

    @post_load
    def make_upload(self, data, **kwargs):
        return data

class ErrorResponse(Schema):
    message = fields.String(required=True)
    error = fields.String(allow_none=True)

    @post_load
    def make_error(self, data, **kwargs):
        return data
    
    class Meta:
        ordered = True

class ContentListResponse(BaseResponseSchema):
    contents = fields.Nested(ContentSchema, many=True)

    @post_load
    def make_list(self, data, **kwargs):
        return data

    class Meta:
        ordered = True
    

# region Campaign Schema
class CampaignBaseSchema(Schema):
    name = fields.String(required=True)
    active = fields.Boolean(dump_default=False)

    @post_load
    def make_campaign(self, data, **kwargs):
        return data

    class Meta:
        ordered = True

class CampaignSchema(CampaignBaseSchema):
    id = fields.Integer(required=True)

    @classmethod
    def from_orm(cls, campaign: Campaign):
        return cls().load(data=dict(
            id=campaign.id,
            name=campaign.name,
            active=campaign.active
        ))

class CampaignCreateRequest(BaseRequestSchema):
    name = fields.String(required=True)
    active = fields.Boolean(dump_default=False)

    class Meta:
        ordered = True

class CampaignUpdateRequest(CampaignBaseSchema, BaseRequestSchema):
    name = fields.String(required=False)
    active = fields.Boolean(dump_default=False)

    class Meta:
        ordered = True

class CampaignResponse(BaseResponseSchema):
    campaign = fields.Nested(CampaignSchema)

    class Meta:
        ordered = True

class CampaignListResponse(BaseResponseSchema):
    campaigns = fields.Nested(CampaignSchema, many=True)

    @post_load
    def make_list(self, data, **kwargs):
        return data

    class Meta:
        ordered = True
